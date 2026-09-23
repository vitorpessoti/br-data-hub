import PageBreadcrumb from "@/components/common/page-breadcrumb.component";
import CheckboxComponents from "@/modules/elements/form-elements/components/checkbox-section.component";
import DefaultInputs from "@/modules/elements/form-elements/components/default-inputs-section.component";
import DropzoneComponent from "@/modules/elements/form-elements/components/dropzone-section.component";
import FileInputExample from "@/modules/elements/form-elements/components/file-input-section.component";
import InputGroup from "@/modules/elements/form-elements/components/input-group-section.component";
import InputStates from "@/modules/elements/form-elements/components/input-states-section.component";
import RadioButtons from "@/modules/elements/form-elements/components/radio-section.component";
import SelectInputs from "@/modules/elements/form-elements/components/select-inputs-section.component";
import TextAreaInput from "@/modules/elements/form-elements/components/text-area-section.component";
import ToggleSwitch from "@/modules/elements/form-elements/components/toggle-switch-section.component";
export default function FormElementsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Elementos de formulário" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <DefaultInputs />
          <SelectInputs />
          <TextAreaInput />
          <InputStates />
        </div>
        <div className="space-y-6">
          <InputGroup />
          <FileInputExample />
          <CheckboxComponents />
          <RadioButtons />
          <ToggleSwitch />
          <DropzoneComponent />
        </div>
      </div>
    </div>
  );
}
