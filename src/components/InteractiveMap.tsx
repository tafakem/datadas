import React, { useState } from 'react';
import { MapPin, Navigation, Info, Building2, Users, Target, Activity, X } from 'lucide-react';
import { DistrictCoverage } from '../types/health';
import { storageService } from '../services/storageService';

interface Props {
  districts?: DistrictCoverage[];
}

export const InteractiveMap: React.FC<Props> = ({ districts: propDistricts }) => {
  const districts = propDistricts || storageService.getDistricts();
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictCoverage | null>(districts[0] || null);
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictCoverage | null>(null);

  // SVG coordinate mock layout for metropolitan districts
  const districtSvgCoords: Record<string, { x: number; y: number; width: number; height: number; path: string }> = {
    'DIST-01': { x: 190, y: 120, width: 140, height: 75, path: 'M 190,120 L 320,120 L 330,170 L 260,195 L 190,170 Z' }, // San Martín de Porres
    'DIST-02': { x: 260, y: 55, width: 110, height: 65, path: 'M 260,55 L 370,60 L 360,120 L 270,120 Z' }, // Los Olivos
    'DIST-03': { x: 210, y: 245, width: 90, height: 50, path: 'M 210,245 L 295,245 L 290,295 L 205,290 Z' }, // Jesús María
    'DIST-04': { x: 200, y: 200, width: 75, height: 45, path: 'M 200,200 L 270,200 L 270,245 L 200,245 Z' }, // Breña
    'DIST-05': { x: 80, y: 150, width: 110, height: 80, path: 'M 80,150 L 190,150 L 190,230 L 90,225 Z' }, // Callao Cercado
    'DIST-06': { x: 95, y: 225, width: 105, height: 55, path: 'M 95,225 L 200,225 L 195,275 L 105,270 Z' }, // Bellavista
    'DIST-07': { x: 250, y: 360, width: 130, height: 95, path: 'M 250,360 L 380,360 L 370,450 L 240,445 Z' }, // Villa El Salvador
    'DIST-08': { x: 330, y: 120, width: 140, height: 110, path: 'M 330,120 L 460,100 L 470,210 L 340,230 Z' }, // San Juan de Lurigancho
    'DIST-09': { x: 270, y: 10, width: 140, height: 55, path: 'M 270,10 L 410,10 L 400,60 L 260,55 Z' }, // Comas
    'DIST-10': { x: 215, y: 310, width: 95, height: 60, path: 'M 215,310 L 305,310 L 295,370 L 210,360 Z' }, // Chorrillos
  };

  const getColorByCoverage = (pct: number) => {
    if (pct < 50.0) return '#EF4444'; // Malo
    if (pct < 63.33) return '#F97316'; // Regular
    if (pct <= 66.67) return '#10B981'; // Bueno
    return '#3B82F6'; // Revisa
  };

  const getLabelByCoverage = (pct: number) => {
    if (pct < 50.0) return 'Malo (≤ 49.99%)';
    if (pct < 63.33) return 'Regular (50% - 63.33%)';
    if (pct <= 66.67) return 'Bueno (63.33% - 66.67%)';
    return 'Revisa (≥ 66.67%)';
  };

  return (
    <div className="space-y-6">
      {/* Title & Institutional Legend */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            <span>D. Mapa de Visualización Geográfica de Cobertura Sanitaria</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Mapa coroplético interactivo por distritos y jurisdicciones sanitarias. Haga clic en un distrito para ver su detalle.
          </p>
        </div>

        {/* Semáforo Legend */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px] font-bold">
          <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Malo: ≤ 49.99%</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-orange-50 border border-orange-200 text-orange-800">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Regular: 50% - 63.33%</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Bueno: 63.33% - 66.67%</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Revisa: ≥ 66.67%</span>
          </div>
        </div>
      </div>

      {/* Map Interactive Canvas & Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Interactive Map Container */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
          
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none"></div>

          {/* Compass Rose */}
          <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 text-xs flex items-center space-x-2">
            <Navigation className="w-4 h-4 text-emerald-400 rotate-45" />
            <span className="font-bold">Norte Metropolitano</span>
          </div>

          {/* Hover Floating Tooltip */}
          {hoveredDistrict && (
            <div className="absolute top-4 right-4 bg-slate-950/90 backdrop-blur border border-slate-700 px-4 py-2 rounded-xl text-white text-xs z-30 shadow-2xl pointer-events-none animate-in fade-in duration-100">
              <div className="font-extrabold text-sm">{hoveredDistrict.nombre}</div>
              <div className="text-[11px] text-slate-400">{hoveredDistrict.disa}</div>
              <div className="font-mono text-emerald-400 font-bold mt-1">
                {hoveredDistrict.porcentaje}% cobertura • {hoveredDistrict.realizado} / {hoveredDistrict.meta}
              </div>
            </div>
          )}

          {/* Map Vector Graphic */}
          <svg viewBox="0 0 540 470" className="w-full h-full max-h-[460px] z-10 drop-shadow-2xl">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Ocean / Shoreline indication */}
            <path
              d="M 20,80 Q 70,200 80,320 T 150,460"
              fill="none"
              stroke="#0284c7"
              strokeWidth="3"
              strokeDasharray="4 4"
              opacity="0.4"
            />
            <text x="30" y="240" fill="#38bdf8" fontSize="12" fontWeight="bold" opacity="0.5" transform="rotate(-75 30 240)">
              LITORAL COSTERO
            </text>

            {/* Districts polygons */}
            {districts.map(dist => {
              const geom = districtSvgCoords[dist.id];
              if (!geom) return null;
              const isSelected = selectedDistrict?.id === dist.id;
              const isHovered = hoveredDistrict?.id === dist.id;
              const fill = getColorByCoverage(dist.porcentaje);

              return (
                <g 
                  key={dist.id} 
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedDistrict(dist)}
                  onMouseEnter={() => setHoveredDistrict(dist)}
                  onMouseLeave={() => setHoveredDistrict(null)}
                >
                  <path
                    d={geom.path}
                    fill={fill}
                    fillOpacity={isSelected ? 0.95 : isHovered ? 0.85 : 0.7}
                    stroke={isSelected ? '#FFFFFF' : '#0F172A'}
                    strokeWidth={isSelected ? 3 : 1.5}
                    filter={isSelected ? 'url(#glow)' : undefined}
                  />

                  {/* District Centroid Marker & Label */}
                  <circle
                    cx={geom.x + geom.width / 2}
                    cy={geom.y + geom.height / 2}
                    r={isSelected ? 5 : 3.5}
                    fill="#FFFFFF"
                  />
                  <text
                    x={geom.x + geom.width / 2}
                    y={geom.y + geom.height / 2 - 8}
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none pointer-events-none shadow"
                  >
                    {dist.nombre.split(' ')[0]}
                  </text>
                  <text
                    x={geom.x + geom.width / 2}
                    y={geom.y + geom.height / 2 + 14}
                    fill="#F8FAFC"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {dist.porcentaje}%
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Subtext info */}
          <div className="text-[11px] text-slate-400 mt-2 z-10 flex items-center space-x-1">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Toque cualquier distrito para inspeccionar sus establecimientos y métricas sanitarias</span>
          </div>
        </div>

        {/* District Detail Drawer / Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          {selectedDistrict ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider font-mono">
                    {selectedDistrict.id} • {selectedDistrict.disa}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {selectedDistrict.nombre}
                  </h3>
                </div>
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0 mt-1.5"
                  style={{ backgroundColor: getColorByCoverage(selectedDistrict.porcentaje) }}
                  title={getLabelByCoverage(selectedDistrict.porcentaje)}
                ></div>
              </div>

              {/* Status Badge */}
              <div className="p-3.5 rounded-xl border bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Nivel de Cobertura</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {getLabelByCoverage(selectedDistrict.porcentaje)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {selectedDistrict.porcentaje}%
                  </span>
                </div>
              </div>

              {/* Targets Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Meta Programada: {selectedDistrict.meta}</span>
                  <span className="text-blue-600 font-bold">Realizado: {selectedDistrict.realizado}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(selectedDistrict.porcentaje, 100)}%`,
                      backgroundColor: getColorByCoverage(selectedDistrict.porcentaje)
                    }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Déficit / Brecha:</span>
                  <span className="font-bold font-mono text-rose-600">
                    {Math.max(selectedDistrict.meta - selectedDistrict.realizado, 0)} atenciones
                  </span>
                </div>
              </div>

              {/* Infrastructure Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-1.5 text-slate-500 text-xs">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Establecimientos</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {selectedDistrict.eessCount} EESS
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-1.5 text-slate-500 text-xs">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Profesionales</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {selectedDistrict.profesionalesCount} Personal
                  </div>
                </div>
              </div>

              {/* Action recommendation */}
              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
                <strong className="block font-bold mb-0.5">Acción Recomendada:</strong>
                {selectedDistrict.porcentaje < 50 ? (
                  <span>Priorizar brigadas móviles de salud y auditoría de digitación para registrar atenciones rezagadas.</span>
                ) : selectedDistrict.porcentaje < 63.33 ? (
                  <span>Incrementar turnos asistenciales vespertinos en consulta externa y CRED.</span>
                ) : (
                  <span>Mantener el ritmo de atención y garantizar el abastecimiento oportuno de insumos médicos.</span>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <MapPin className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">Seleccione un distrito en el mapa</p>
              <p className="text-xs text-slate-400 mt-1">Haga clic sobre cualquier zona para ver sus indicadores detallados</p>
            </div>
          )}

          {/* Districts quick list */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Distritos Monitoreados
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {districts.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDistrict(d)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center space-x-1 border ${
                    selectedDistrict?.id === d.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getColorByCoverage(d.porcentaje) }}></span>
                  <span>{d.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
