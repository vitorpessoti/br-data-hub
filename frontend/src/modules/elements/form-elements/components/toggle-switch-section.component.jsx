"use client";
import ComponentCard from "@/components/common/component-card.component";
import Switch from "@/components/form/switch/switch.component";
export default function ToggleSwitch() {
  const handleSwitchChange = (checked) => {
    console.log("Switch is now:", checked ? "ON" : "OFF");
  };
  return (
    <ComponentCard title="Interruptores">
      <div className="flex gap-4">
        <Switch
          label="Default"
          defaultChecked={true}
          onChange={handleSwitchChange}
        />
        <Switch
          label="Checked"
          defaultChecked={true}
          onChange={handleSwitchChange}
        />
        <Switch label="Disabled" disabled={true} />
      </div>{" "}
      <div className="flex gap-4">
        <Switch
          label="Default"
          defaultChecked={true}
          onChange={handleSwitchChange}
          color="gray"
        />
        <Switch
          label="Checked"
          defaultChecked={true}
          onChange={handleSwitchChange}
          color="gray"
        />
        <Switch label="Disabled" disabled={true} color="gray" />
      </div>
    </ComponentCard>
  );
}
