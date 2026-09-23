import PageBreadcrumb from "@/components/common/page-breadcrumb.component";
import DefaultModal from "@/modules/elements/modals/components/default-modal-example.component";
import FormInModal from "@/modules/elements/modals/components/form-modal-example.component";
import FullScreenModal from "@/modules/elements/modals/components/full-screen-modal-example.component";
import ModalBasedAlerts from "@/modules/elements/modals/components/feedback-modals-example.component";
import VerticallyCenteredModal from "@/modules/elements/modals/components/centered-modal-example.component";
export default function ModalsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Modais" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-6">
        <DefaultModal />
        <VerticallyCenteredModal />
        <FormInModal />
        <FullScreenModal />
        <ModalBasedAlerts />
      </div>
    </div>
  );
}
