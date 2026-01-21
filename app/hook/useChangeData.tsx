import { useState } from "react";

type ChangeValue =
  | string
  | number
  | boolean
  | File
  | File[]
  | Date
  | null
  | undefined;

type UseChangeDataOptions<T> = {
  /** parse raw value from event */
  parse?: (raw: any, e: Event) => T;
  /** default value */
  defaultValue?: T;
};

export function useChangeData<T = string>(
  options?: UseChangeDataOptions<T>
) {
  const [value, setValue] = useState<T | undefined>(
    options?.defaultValue
  );

  const handleChange = (e: Event) => {
    const target = e.target as any;

    let raw: any;

    // Checkbox / radio
    if (typeof target?.checked === "boolean") {
      raw = target.checked;
    }
    // File
    else if (target?.files) {
      raw = target.multiple
        ? Array.from(target.files)
        : target.files[0];
    }
    // Date
    else if (target?.type === "date") {
      raw = target.value ? new Date(target.value) : null;
    }
    // Text, select, polaris
    else {
      raw = target?.value;
    }

    const parsed = options?.parse
      ? options.parse(raw, e)
      : raw;

    setValue(parsed);
  };

  const reset = () => setValue(options?.defaultValue);

  return {
    value,
    setValue,
    reset,
    handleChange,
    bind: {
      value,
      onInput: handleChange,
      onChange: handleChange,
    },
  };
}

