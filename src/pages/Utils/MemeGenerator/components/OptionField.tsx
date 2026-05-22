// 表情包选项字段组件 - 支持 boolean/string/integer/float 类型
import React from 'react';
import type { MemeOption } from '../types';

interface OptionFieldProps {
  option: MemeOption;
  value: any;
  enabled: boolean;
  onChange: (value: any) => void;
  onEnabledChange: (enabled: boolean) => void;
}

const OptionField: React.FC<OptionFieldProps> = ({ option, value, enabled, onChange, onEnabledChange }) => {
  const handleInput = (val: any) => {
    if (!enabled) {
      onEnabledChange(true);
    }
    onChange(val);
  };

  return (
    <div className="meme-option-field">
      <label className="meme-option-label">
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => onEnabledChange(!enabled)}
          className="meme-option-checkbox"
        />
        <span>{option.description || option.name}</span>
        {!enabled && <span className="meme-option-unset">（未指定）</span>}
      </label>

      <div className={`meme-option-control ${!enabled ? 'meme-option-disabled' : ''}`}>
        {/* Boolean */}
        {option.type === 'boolean' && (
          <div className="meme-option-toggle-wrap">
            <button
              className={`meme-option-toggle ${value ? 'meme-option-toggle-on' : ''}`}
              onClick={() => handleInput(!value)}
            >
              <span className={`meme-option-toggle-dot ${value ? 'meme-option-toggle-dot-on' : ''}`} />
            </button>
            <span className="meme-option-toggle-label">{value ? '开启' : '关闭'}</span>
          </div>
        )}

        {/* String with choices */}
        {option.type === 'string' && option.choices && option.choices.length > 0 && (
          <select
            className="meme-input meme-select"
            value={value || ''}
            onChange={(e) => handleInput(e.target.value)}
          >
            <option value="">请选择</option>
            {option.choices.map((choice) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </select>
        )}

        {/* String without choices */}
        {option.type === 'string' && (!option.choices || option.choices.length === 0) && (
          <input
            type="text"
            className="meme-input"
            value={value || ''}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={option.default || ''}
          />
        )}

        {/* Integer */}
        {option.type === 'integer' && (
          <div className="meme-option-range-wrap">
            <input
              type="range"
              className="meme-option-range"
              value={value ?? 0}
              onChange={(e) => handleInput(Number(e.target.value))}
              min={option.minimum ?? 0}
              max={option.maximum ?? 100}
              step={1}
            />
            <input
              type="number"
              className="meme-input meme-option-number"
              value={value ?? 0}
              onChange={(e) => handleInput(Number(e.target.value))}
              min={option.minimum ?? undefined}
              max={option.maximum ?? undefined}
            />
          </div>
        )}

        {/* Float */}
        {option.type === 'float' && (
          <div className="meme-option-range-wrap">
            <input
              type="range"
              className="meme-option-range"
              value={value ?? 0}
              onChange={(e) => handleInput(Number(e.target.value))}
              min={option.minimum ?? 0}
              max={option.maximum ?? 1}
              step={0.01}
            />
            <input
              type="number"
              className="meme-input meme-option-number"
              value={value ?? 0}
              onChange={(e) => handleInput(Number(e.target.value))}
              min={option.minimum ?? undefined}
              max={option.maximum ?? undefined}
              step={0.01}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OptionField;
