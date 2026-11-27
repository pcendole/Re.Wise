import React from 'react';

interface BasicEditorProps {
  front: string;
  onChangeFront: (front: string) => void;
  back: string;
  onChangeBack: (back: string) => void;
  hint?: string;
  onChangeHint?: (hint: string) => void;
}

export const BasicEditor: React.FC<BasicEditorProps> = ({
  front,
  onChangeFront,
  back,
  onChangeBack,
}) => {
  return (
    <div className="space-y-4">
      {/* Front */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-theme-secondary">Front</label>
        <textarea
          rows={4}
          value={front}
          onChange={(e) => onChangeFront(e.target.value)}
          placeholder="Question or prompt..."
          className="w-full bg-transparent text-sm text-theme-primary placeholder:text-theme-secondary focus:outline-none resize-none leading-relaxed"
        />
      </div>

      <div className="border-t border-theme" />

      {/* Back */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-theme-secondary">Back</label>
        <textarea
          rows={4}
          value={back}
          onChange={(e) => onChangeBack(e.target.value)}
          placeholder="Answer or recall target..."
          className="w-full bg-transparent text-sm text-theme-primary placeholder:text-theme-secondary focus:outline-none resize-none leading-relaxed"
        />
      </div>
    </div>
  );
};
