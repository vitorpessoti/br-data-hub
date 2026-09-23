"use client";

import ComponentCard from "@/components/common/component-card.component";
import FeedbackModal from "@/components/ui/modal/feedback-modal.component";
import { useModal } from "@/hooks/use-modal.hook";

const EXAMPLES = [
  {
    variant: "success",
    label: "Sucesso",
    button: "bg-success-500 hover:bg-success-600",
    title: "Tudo certo!",
    message: "A operação foi concluída com sucesso.",
  },
  {
    variant: "info",
    label: "Informação",
    button: "bg-blue-light-500 hover:bg-blue-light-600",
    title: "Informação",
    message: "Os dados exibidos são atualizados a cada 24 horas.",
  },
  {
    variant: "warning",
    label: "Aviso",
    button: "bg-warning-500 hover:bg-warning-600",
    title: "Atenção!",
    message: "Você está próximo do limite de consultas do seu plano.",
  },
  {
    variant: "error",
    label: "Erro",
    button: "bg-error-500 hover:bg-error-600",
    title: "Algo deu errado!",
    message: "Não foi possível concluir a operação. Tente novamente.",
  },
];

function FeedbackModalTrigger({ example }) {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`rounded-lg px-4 py-3 text-sm font-medium text-white shadow-theme-xs ${example.button}`}
      >
        {example.label}
      </button>
      <FeedbackModal
        isOpen={isOpen}
        onClose={closeModal}
        variant={example.variant}
        title={example.title}
        message={example.message}
      />
    </>
  );
}

export default function FeedbackModalsExample() {
  return (
    <ComponentCard title="Modais de feedback">
      <div className="flex flex-wrap items-center gap-3">
        {EXAMPLES.map((example) => (
          <FeedbackModalTrigger key={example.variant} example={example} />
        ))}
      </div>
    </ComponentCard>
  );
}
