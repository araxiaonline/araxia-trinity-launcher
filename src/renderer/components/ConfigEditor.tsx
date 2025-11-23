import { useState } from 'react'
import { AppConfig } from '@/shared/types'
import yaml from 'js-yaml'

interface Props {
  config: AppConfig
  onSave: (config: AppConfig) => void
  onCancel: () => void
}

export default function ConfigEditor({ config, onSave, onCancel }: Props) {
  const [yamlContent, setYamlContent] = useState(yaml.dump(config, { indent: 2 }))
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    try {
      const parsed = yaml.load(yamlContent) as AppConfig
      if (!parsed.servers || !Array.isArray(parsed.servers)) {
        throw new Error('Invalid config: missing or invalid servers array')
      }
      onSave(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid YAML')
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Edit Configuration</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-900 text-red-100 rounded text-sm">
          {error}
        </div>
      )}

      <textarea
        value={yamlContent}
        onChange={e => {
          setYamlContent(e.target.value)
          setError(null)
        }}
        className="w-full h-96 p-4 bg-gray-700 text-white rounded font-mono text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
        spellCheck="false"
      />

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
