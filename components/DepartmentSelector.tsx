
import React from 'react';
import { Department } from '../types';

interface Props {
  selected?: Department;
  onSelect: (dept: Department) => void;
}

const departments: Department[] = [
  'Digital & IT Services',
  'Production',
  'Logistics',
  'Facilities',
  'Marketing & E-commerce',
  'Admin/Corporate'
];

export const DepartmentSelector: React.FC<Props> = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {departments.map((dept) => (
        <button
          key={dept}
          onClick={() => onSelect(dept)}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border-2 ${
            selected === dept
              ? 'bg-amber-500 border-amber-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
          }`}
        >
          {dept}
        </button>
      ))}
    </div>
  );
};
