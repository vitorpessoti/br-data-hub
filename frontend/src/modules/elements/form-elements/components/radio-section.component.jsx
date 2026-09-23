"use client";
import { useState } from "react";
import ComponentCard from "@/components/common/component-card.component";
import Radio from "@/components/form/input/radio.component";
export default function RadioButtons() {
  const [selectedValue, setSelectedValue] = useState("option2");
  const handleRadioChange = (value) => {
    setSelectedValue(value);
  };
  return (
    <ComponentCard title="Botões de opção">
      <div className="flex flex-wrap items-center gap-8">
        <Radio
          id="radio1"
          name="group1"
          value="option1"
          checked={selectedValue === "option1"}
          onChange={handleRadioChange}
          label="Default"
        />
        <Radio
          id="radio2"
          name="group1"
          value="option2"
          checked={selectedValue === "option2"}
          onChange={handleRadioChange}
          label="Selected"
        />
        <Radio
          id="radio3"
          name="group1"
          value="option3"
          checked={selectedValue === "option3"}
          onChange={handleRadioChange}
          label="Disabled"
          disabled={true}
        />
      </div>
    </ComponentCard>
  );
}
