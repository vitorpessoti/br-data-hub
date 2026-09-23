import { cn } from "@/utils/cn.util";
import { useState } from "react";
const ChartTab = () => {
  const [selected, setSelected] = useState("optionOne");
  const getButtonClass = (option) =>
    selected === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";
  return (
    <div className="flex max-h-10 items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        onClick={() => setSelected("optionOne")}
        className={`w-full rounded-md px-3 py-2 text-theme-sm font-medium hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionOne")}`}
      >
        Mensal
      </button>

      <button
        onClick={() => setSelected("optionTwo")}
        className={cn(
          "w-full rounded-md px-3 py-1.5 text-theme-sm font-medium hover:text-gray-900 rtl:min-w-20 dark:hover:text-white",
          getButtonClass("optionTwo"),
        )}
      >
        Trimestral
      </button>

      <button
        onClick={() => setSelected("optionThree")}
        className={`w-full rounded-md px-3 py-2 text-theme-sm font-medium hover:text-gray-900 dark:hover:text-white ${getButtonClass("optionThree")}`}
      >
        Anual
      </button>
    </div>
  );
};
export default ChartTab;
