"use client";
import ComponentCard from "@/components/common/component-card.component";
import FileInput from "@/components/form/input/file-input.component";
import Label from "@/components/form/label.component";
export default function FileInputExample() {
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file:", file.name);
    }
  };
  return (
    <ComponentCard title="Seleção de arquivo">
      <div>
        <Label>Upload file</Label>
        <FileInput onChange={handleFileChange} className="custom-class" />
      </div>
    </ComponentCard>
  );
}
