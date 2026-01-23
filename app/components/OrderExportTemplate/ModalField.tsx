type FieldOption = {
  label: string;
  path: string;
};

type ModalFieldProps = {
  query: string;
  selectedPaths: string[];
  availableFields: FieldOption[];

  onSearchChange: (v: string) => void;
  onChangeSelected: (paths: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
};

export const ModalField = ({
  query,
  selectedPaths,
  availableFields,
  onSearchChange,
  onChangeSelected,
  onSave,
  onCancel,
}: ModalFieldProps) => {
  return (
    <s-modal id="add-field-modal" heading="Add export fields">
      <s-stack gap="base">
        <s-search-field
          label="Search"
          labelAccessibilityVisibility="exclusive"
          placeholder="Search fields"
          value={query}
          onInput={(e: Event) =>
            onSearchChange((e.target as HTMLInputElement).value)
          }
        />

       <s-choice-list
        label="Available fields"
        name="fields"
        multiple
        values={selectedPaths}
        onChange={(event) => {
          const target = event.currentTarget as unknown as {
            values: string[];
          };

          onChangeSelected(target.values ?? []);
        }}
      >
        {availableFields.map(f => (
          <s-choice key={f.path} value={f.path}>
            {f.label}
          </s-choice>
        ))}
      </s-choice-list>

      </s-stack>
      <s-button
        slot="secondary-actions"
        commandFor="add-field-modal"
        command="--hide"
        onClick={onCancel}
      >
        Cancel
      </s-button>

      <s-button
        slot="primary-action"
        variant="primary"
        commandFor="add-field-modal"
        command="--hide"
        onClick={onSave}
      >
        Save
      </s-button>
    </s-modal>
  );
};
