import { Button } from "@/components/ui/button"

interface PickerFooterProps {
  onCancel: () => void
  onSave: () => void
  onRemove?: () => void
  removeLabel?: string
  saveLabel?: string
}

export function PickerFooter({
  onCancel,
  onSave,
  onRemove,
  removeLabel = "Remove",
  saveLabel = "Save",
}: PickerFooterProps) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      {onRemove ? (
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
          {removeLabel}
        </Button>
      ) : (
        <div />
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}
