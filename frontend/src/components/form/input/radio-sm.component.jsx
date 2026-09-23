const RadioSm = ({
  id,
  name,
  value,
  checked,
  label,
  onChange,
  className = "",
}) => {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center text-sm text-gray-500 select-none dark:text-gray-400 ${className}`}
    >
      <span className="relative">
        {/* Hidden Input */}
        <input
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={checked}
          onChange={() => onChange(value)}
          className="sr-only"
        />
        {/* Styled Radio Circle */}
        <span
          className={`me-2 flex h-4 w-4 items-center justify-center rounded-full border ${
            checked
              ? "border-brand-500 bg-brand-500"
              : "border-gray-300 bg-transparent dark:border-gray-700"
          }`}
        >
          {/* Inner Dot */}
          <span
            className={`h-1.5 w-1.5 rounded-full ${checked ? "bg-white" : "bg-white dark:bg-[#1e2636]"}`}
          ></span>
        </span>
      </span>
      {label}
    </label>
  );
};
export default RadioSm;
