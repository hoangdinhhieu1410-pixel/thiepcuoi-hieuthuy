import React, { useState, useEffect, useRef } from 'react';
import { Edit2 } from 'lucide-react';

export function EditableText({
  value = '',
  onChange,
  isEditing = false,
  className = '',
  placeholder = 'Nhập nội dung...',
  multiline = false,
  as: Component = 'span',
  style = {}
}) {
  const [currentVal, setCurrentVal] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setCurrentVal(value || '');
  }, [value]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setCurrentVal(newVal);
    if (onChange) {
      onChange(newVal);
    }
  };

  if (!isEditing) {
    return (
      <Component className={className} style={style}>
        {value}
      </Component>
    );
  }

  // When in Live Edit mode
  if (multiline) {
    return (
      <div className="relative inline-block w-full group my-0.5">
        <textarea
          ref={inputRef}
          value={currentVal}
          onChange={handleChange}
          placeholder={placeholder}
          rows={2}
          className={`${className} w-full bg-white/70 hover:bg-white focus:bg-white border-2 border-dashed border-[#70561f]/60 focus:border-[#70561f] rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-[#e6b685] transition-all resize-none shadow-sm`}
          style={style}
        />
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none p-1 rounded bg-[#70561f] text-white">
          <Edit2 className="w-2.5 h-2.5" />
        </div>
      </div>
    );
  }

  return (
    <span className="relative inline-block max-w-full group mx-0.5 align-middle">
      <input
        ref={inputRef}
        type="text"
        value={currentVal}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${className} bg-white/80 hover:bg-white focus:bg-white border-b-2 border-dashed border-[#70561f]/70 focus:border-[#70561f] px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[#70561f] transition-all shadow-sm`}
        style={style}
        size={Math.max(1, (currentVal || '').length || 10)}
      />
      <span className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none p-0.5 rounded-full bg-[#70561f] text-white shadow">
        <Edit2 className="w-2.5 h-2.5" />
      </span>
    </span>
  );
}
