import React from 'react';
import { Bed, UserCheck, Home, MapPin } from 'lucide-react';
import { Atencion } from '../../types/health';

interface Props {
  atenciones: Atencion[];
}

export const AtencionesTipoAtencion: React.FC<Props> = ({ atenciones }) => {
  const total = atenciones.length || 1;

  // Tipo Atención
  const ambulatorio = atenciones.filter(a => a.tipo_atencion === 'AMBULATORIO').length;
  const hospitalizado = atenciones.filter(a => a.tipo_atencion === 'HOSPITALIZADO').length;
  const emergencia = atenciones.filter(a => a.tipo_atencion === 'EMERGENCIA').length;

  // Lugar Atención
  const intramural = atenciones.filter(a => a.lugar_atencion === 'INTRAMURAL').length;
  const extramural = atenciones.filter(a => a.lugar_atencion === 'EXTRAMURAL').length;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
          <Bed className="w-6 h-6 text-blue-600" />
          <span>B.7. Atenciones por Modalidad y Lugar de Atención</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Comparativa entre atención ambulatoria vs hospitalizada, y prestaciones intramurales vs campañas extramurales
        </p>
      </div>

      {/* Grid 2 Blocks: Tipo and Lugar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Modalidad: Ambulatorio vs Hospitalizado */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <span>Modalidad Asistencial</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100">
              <span className="text-xs font-bold text-indigo-700 uppercase">Ambulatorio</span>
              <div className="text-2xl font-extrabold text-indigo-900 font-mono mt-1">{ambulatorio}</div>
              <div className="text-xs text-indigo-600 font-semibold mt-1">
                {Math.round((ambulatorio / total) * 100)}% del total
              </div>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-100">
              <span className="text-xs font-bold text-rose-700 uppercase">Hospitalizado</span>
              <div className="text-2xl font-extrabold text-rose-900 font-mono mt-1">{hospitalizado}</div>
              <div className="text-xs text-rose-600 font-semibold mt-1">
                {Math.round((hospitalizado / total) * 100)}% del total
              </div>
            </div>
          </div>

          {/* Dual Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Ambulatorio ({Math.round((ambulatorio / total) * 100)}%)</span>
              <span>Hospitalizado ({Math.round((hospitalizado / total) * 100)}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
              <div 
                className="bg-indigo-600 h-full transition-all duration-500" 
                style={{ width: `${(ambulatorio / total) * 100}%` }}
              ></div>
              <div 
                className="bg-rose-500 h-full transition-all duration-500" 
                style={{ width: `${(hospitalizado / total) * 100}%` }}
              ></div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            La atención ambulatoria representa la puerta de entrada principal al sistema de salud en el primer nivel de atención, permitiendo resolver más del 85% de las patologías comunes.
          </p>
        </div>

        {/* Lugar: Intramural vs Extramural */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Home className="w-5 h-5 text-emerald-600" />
            <span>Lugar de la Prestación</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs font-bold text-emerald-700 uppercase">Intramural</span>
              <div className="text-2xl font-extrabold text-emerald-900 font-mono mt-1">{intramural}</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">
                {Math.round((intramural / total) * 100)}% del total
              </div>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-100">
              <span className="text-xs font-bold text-amber-700 uppercase">Extramural</span>
              <div className="text-2xl font-extrabold text-amber-900 font-mono mt-1">{extramural}</div>
              <div className="text-xs text-amber-600 font-semibold mt-1">
                {Math.round((extramural / total) * 100)}% del total
              </div>
            </div>
          </div>

          {/* Dual Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Intramural ({Math.round((intramural / total) * 100)}%)</span>
              <span>Extramural ({Math.round((extramural / total) * 100)}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
              <div 
                className="bg-emerald-600 h-full transition-all duration-500" 
                style={{ width: `${(intramural / total) * 100}%` }}
              ></div>
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${(extramural / total) * 100}%` }}
              ></div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Las prestaciones extramurales comprenden visitas domiciliarias, campañas de vacunación comunitaria, tamizajes en colegios y brigadas itinerantes en comunidades alejadas.
          </p>
        </div>

      </div>
    </div>
  );
};
