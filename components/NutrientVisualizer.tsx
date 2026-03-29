'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type NutrientVisualizerProps = {
  nutrition: {
    calories: string;
    protein: string;
    fat: string;
    carbs: string;
  };
};

const DAILY_VALUES = {
  protein: 50, // g
  carbs: 275, // g
  fat: 78, // g
};

export default function NutrientVisualizer({ nutrition }: NutrientVisualizerProps) {
  const protein = parseInt(nutrition.protein) || 0;
  const carbs = parseInt(nutrition.carbs) || 0;
  const fat = parseInt(nutrition.fat) || 0;

  const data = [
    { name: 'Protein', value: protein, daily: DAILY_VALUES.protein, color: '#10b981' },
    { name: 'Carbs', value: carbs, daily: DAILY_VALUES.carbs, color: '#f59e0b' },
    { name: 'Fat', value: fat, daily: DAILY_VALUES.fat, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'transparent' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {data.map((nutrient) => (
          <div key={nutrient.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-stone-700">{nutrient.name}</span>
              <span className="text-stone-500">{nutrient.value}g / {nutrient.daily}g</span>
            </div>
            <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ 
                  width: `${Math.min((nutrient.value / nutrient.daily) * 100, 100)}%`,
                  backgroundColor: nutrient.color 
                }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
