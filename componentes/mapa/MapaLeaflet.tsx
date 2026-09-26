"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAPA_TILE_ATRIBUICAO, MAPA_TILE_URL, PIN_META, type SalaoPublico } from "@/lib/mapaSaloes";

type Ponto = SalaoPublico & { displayLat: number; displayLng: number };

type Props = {
  saloes: Ponto[];
  centro: { lat: number; lng: number } | null;
  selecionadoId: string | null;
  onSelect: (id: string) => void;
  focoKey: string;
  className?: string;
};

export default function MapaLeaflet({
  saloes,
  centro,
  selecionadoId,
  onSelect,
  focoKey,
  className,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let mapa: LeafletMap | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !el.current || mapRef.current) return;

      mapa = L.map(el.current, {
        zoomControl: false,
        attributionControl: true,
      });
      L.control.zoom({ position: "bottomright" }).addTo(mapa);
      L.tileLayer(MAPA_TILE_URL, {
        attribution: MAPA_TILE_ATRIBUICAO,
        maxZoom: 19,
        maxNativeZoom: 19,
      }).addTo(mapa);
      mapa.setView([-14.2, -51.9], 4);
      layerRef.current = L.layerGroup().addTo(mapa);
      mapRef.current = mapa;
      setPronto(true);
      const ajustar = () => mapa?.invalidateSize();
      setTimeout(ajustar, 50);
      setTimeout(ajustar, 300);
      const obs = new ResizeObserver(() => ajustar());
      if (el.current) obs.observe(el.current);
      (mapa as LeafletMap & { __obs?: ResizeObserver }).__obs = obs;
    })();

    return () => {
      cancelado = true;
      (mapa as (LeafletMap & { __obs?: ResizeObserver }) | null)?.__obs?.disconnect();
      mapa?.remove();
      mapRef.current = null;
      layerRef.current = null;
      setPronto(false);
    };
  }, []);

  useEffect(() => {
    if (!pronto || !mapRef.current || !layerRef.current) return;
    let cancelado = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !layerRef.current || !mapRef.current) return;
      layerRef.current.clearLayers();

      for (const s of saloes) {
        const ativo = s.id === selecionadoId;
        const cor = PIN_META[s.pin]?.cor || PIN_META.parceiro.cor;
        const size = ativo ? 42 : 32;
        const icon = L.divIcon({
          className: "mapa-pin-wrap",
          html: pinSvg(cor, size, ativo),
          iconSize: [size, size + 10],
          iconAnchor: [size / 2, size + 8],
        });
        const marker = L.marker([s.displayLat, s.displayLng], { icon, zIndexOffset: ativo ? 500 : 0 });
        marker.on("click", () => onSelectRef.current(s.id));
        marker.addTo(layerRef.current);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [pronto, saloes, selecionadoId]);

  useEffect(() => {
    if (!pronto || !mapRef.current) return;
    const mapa = mapRef.current;
    if (saloes.length > 1) {
      const b = saloes.reduce(
        (acc, s) => {
          acc.minLat = Math.min(acc.minLat, s.displayLat);
          acc.maxLat = Math.max(acc.maxLat, s.displayLat);
          acc.minLng = Math.min(acc.minLng, s.displayLng);
          acc.maxLng = Math.max(acc.maxLng, s.displayLng);
          return acc;
        },
        { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
      );
      mapa.fitBounds(
        [
          [b.minLat, b.minLng],
          [b.maxLat, b.maxLng],
        ],
        { padding: [36, 36], maxZoom: 14 }
      );
      return;
    }
    if (saloes.length === 1) {
      mapa.setView([saloes[0].displayLat, saloes[0].displayLng], 15);
      return;
    }
    if (centro) mapa.setView([centro.lat, centro.lng], 13);
    // focoKey é o gatilho da busca; a lista entra só para ler as coordenadas daquele momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, focoKey]);

  useEffect(() => {
    if (!pronto || !mapRef.current || !selecionadoId) return;
    const alvo = saloes.find((s) => s.id === selecionadoId);
    if (alvo) mapRef.current.flyTo([alvo.displayLat, alvo.displayLng], 16, { duration: 0.7 });
  }, [pronto, selecionadoId, saloes]);

  return <div ref={el} className={`mapa-canvas h-full w-full ${className || ""}`} />;
}

function pinSvg(cor: string, size: number, ativo: boolean) {
  const anel = ativo ? `stroke="#1A1A1A" stroke-width="2"` : `stroke="#fff" stroke-width="1.5"`;
  return `<svg width="${size}" height="${size + 10}" viewBox="0 0 32 42" aria-hidden="true">
    <path d="M16 1C8 1 2 7.2 2 15.2 2 26 16 41 16 41s14-15 14-25.8C30 7.2 24 1 16 1z" fill="${cor}" ${anel}/>
    <circle cx="16" cy="15" r="5.5" fill="#fff"/>
  </svg>`;
}
