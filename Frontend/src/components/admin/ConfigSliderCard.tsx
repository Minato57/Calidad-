import { Card } from '../common/Card';

interface ConfigSliderCardProps {
    titulo: string;
    subtitulo: string;
    min: number;
    max: number;
    valor: number;
    sufijo?: string;
    onChange: (valor: number) => void;
}

export const ConfigSliderCard = ({
    titulo,
    subtitulo,
    min,
    max,
    valor,
    sufijo = '',
    onChange,
}: ConfigSliderCardProps) => (
    <Card bordeLateral="sky" className="p-6">
        <h2 className="text-base font-bold text-blue-deep mb-1">{titulo}</h2>
        <p className="text-xs text-mute mb-5">{subtitulo}</p>
        <input
            type="range"
            min={min}
            max={max}
            value={valor}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-sky-main"
            aria-label={titulo}
        />
        <div className="flex justify-between text-xs text-mute mt-1">
            <span>{min}</span>
            <span className="text-2xl font-extrabold text-sky-deep">
                {valor}{sufijo ? ` ${sufijo}` : ''}
            </span>
            <span>{max}</span>
        </div>
    </Card>
);

