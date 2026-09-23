"use client";
import { useModal } from "@/hooks/use-modal.hook";
import ComponentCard from "@/components/common/component-card.component";
import Button from "@/components/ui/button/button.component";
import { Modal } from "@/components/ui/modal/modal.component";
export default function VerticallyCenteredModal() {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };
  return (
    <ComponentCard title="Modal centralizado">
      <Button size="sm" onClick={openModal}>
        Open Modal
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        showCloseButton={false}
        className="max-w-126.75 p-6 lg:p-10"
      >
        <div className="text-center">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 sm:text-title-sm dark:text-white/90">
            All Done! Success Confirmed
          </h4>
          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Pellentesque euismod est quis mauris lacinia pharetra.
          </p>

          <div className="mt-8 flex w-full items-center justify-center gap-3">
            <Button size="sm" variant="outline" onClick={closeModal}>
              Close
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </ComponentCard>
  );
}
