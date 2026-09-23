"use client";
import { useModal } from "@/hooks/use-modal.hook";
import ComponentCard from "@/components/common/component-card.component";
import Label from "@/components/form/label.component";
import Input from "@/components/form/input/input-field.component";
import Button from "@/components/ui/button/button.component";
import { Modal } from "@/components/ui/modal/modal.component";
export default function FormInModal() {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };
  return (
    <ComponentCard title="Formulário em modal">
      <Button size="sm" onClick={openModal}>
        Open Modal
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-146 p-5 lg:p-10"
      >
        <form className="">
          <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div className="col-span-1">
              <Label>First Name</Label>
              <Input type="text" placeholder="Emirhan" />
            </div>

            <div className="col-span-1">
              <Label>Last Name</Label>
              <Input type="text" placeholder="Boruch" />
            </div>

            <div className="col-span-1">
              <Label>Last Name</Label>
              <Input type="email" placeholder="emirhanboruch55@gmail.com" />
            </div>

            <div className="col-span-1">
              <Label>Phone</Label>
              <Input type="text" placeholder="+09 363 398 46" />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <Label>Bio</Label>
              <Input type="text" placeholder="Team Manager" />
            </div>
          </div>

          <div className="mt-6 flex w-full items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeModal}>
              Close
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </ComponentCard>
  );
}
