const SOURCE_OPTIONS = [
  { value: 'pdf', label: 'PDF document' },
  { value: 'video', label: 'Video link' },
  { value: 'audio', label: 'Audio link' },
  { value: 'image', label: 'Image' },
  { value: 'zip', label: 'Compressed file' },
  { value: 'webpage', label: 'Article or webpage' },
];

const UPLOAD_SUPPORTED_TYPES = new Set(['pdf', 'image', 'zip']);

export default function IntakeForm({ form, onChange, onSubmit, loading }) {
  const uploadSupported = UPLOAD_SUPPORTED_TYPES.has(form.sourceType);
  const fileAccept =
    form.sourceType === 'pdf'
      ? '.pdf,application/pdf'
      : form.sourceType === 'image'
        ? 'image/*'
        : form.sourceType === 'zip'
          ? '.zip,application/zip,application/x-zip-compressed'
          : '';

  return (
    <form className="intake-form" onSubmit={onSubmit}>
      <div className="field field-wide">
        <span>Input mode</span>
        <div className="segmented-toggle">
          <button
            className={`segment-button ${form.inputMode === 'url' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('inputMode', 'url')}
          >
            Use link
          </button>
          <button
            className={`segment-button ${form.inputMode === 'upload' ? 'active' : ''}`}
            type="button"
            onClick={() => onChange('inputMode', 'upload')}
          >
            Upload file
          </button>
        </div>
      </div>

      <label className="field">
        <span>Content type</span>
        <select
          value={form.sourceType}
          onChange={(event) => onChange('sourceType', event.target.value)}
        >
          {SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {form.inputMode === 'url' ? (
        <label className="field field-wide">
          <span>Source URL</span>
          <input
            type="url"
            placeholder="Paste a PDF, YouTube, image, zip, or article link"
            value={form.sourceUrl}
            onChange={(event) => onChange('sourceUrl', event.target.value)}
            required
          />
        </label>
      ) : (
        <label className="field field-wide">
          <span>Local file</span>
          <input
            type="file"
            accept={fileAccept}
            onChange={(event) => onChange('sourceFile', event.target.files?.[0] || null)}
            disabled={!uploadSupported}
            required
          />
          {!uploadSupported ? (
            <small className="field-help">
              Local upload is currently supported for PDF, image, and zip files. Use a link for video, audio, or webpage sources.
            </small>
          ) : form.sourceFile ? (
            <small className="field-help">Selected: {form.sourceFile.name}</small>
          ) : (
            <small className="field-help">Choose a local {form.sourceType} file from your computer.</small>
          )}
        </label>
      )}

      <div className="intake-footer">
        <div className="intake-note">
          {form.inputMode === 'url'
            ? 'Study Sage fetches the link, extracts the useful content, then builds a summary, resource list, quiz, and study chat around it.'
            : 'Study Sage can also process local PDFs and images directly from your device, then turn them into a study session.'}
        </div>
        <button
          className="primary-button"
          type="submit"
          disabled={loading || (form.inputMode === 'upload' && (!uploadSupported || !form.sourceFile))}
        >
          {loading ? 'Analyzing source...' : 'Build study session'}
        </button>
      </div>
    </form>
  );
}
