"use client";
import { useModal } from "@/hooks/use-modal.hook";
import { PencilIcon } from "@/icons";
import Input from "@/components/form/input/input-field.component";
import Label from "@/components/form/label.component";
import Button from "@/components/ui/button/button.component";
import { Modal } from "@/components/ui/modal/modal.component";
import { CURRENT_USER_MOCK } from "@/mocks/user.mock";
export default function UserAddressCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { location } = CURRENT_USER_MOCK;
  const handleSave = () => {
    // A gravação será feita na integração com o backend.
    closeModal();
  };
  return (
    <>
      <div className="rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
        <div className="flex flex-col gap-6 sm:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <h4 className="mb-4 text-lg font-semibold text-gray-800 lg:mb-6 dark:text-white/90">
              Endereço
            </h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  País
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {location.country}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Cidade/Estado
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {location.city}, {location.state}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  CEP
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {location.postalCode}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  CPF
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  ***.456.789-**
                </p>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={openModal}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 lg:inline-flex lg:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-gray-200"
            >
              <PencilIcon className="size-5" />
              Editar
            </button>
          </div>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="m-4 max-w-[700px]">
        <div className="relative no-scrollbar w-full overflow-y-auto rounded-3xl bg-white p-4 lg:p-11 dark:bg-gray-900">
          <div className="px-2 pe-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Editar endereço
            </h4>
            <p className="mb-6 text-sm text-gray-500 lg:mb-7 dark:text-gray-400">
              Atualize seus dados para manter o perfil em dia.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar overflow-y-auto px-2">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div>
                  <Label>País</Label>
                  <Input type="text" defaultValue={location.country} />
                </div>

                <div>
                  <Label>Cidade/Estado</Label>
                  <Input
                    type="text"
                    defaultValue={`${location.city}, ${location.state}`}
                  />
                </div>

                <div>
                  <Label>CEP</Label>
                  <Input type="text" defaultValue={location.postalCode} />
                </div>

                <div>
                  <Label>CPF</Label>
                  <Input type="text" defaultValue="***.456.789-**" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Fechar
              </Button>
              <Button size="sm" onClick={handleSave}>
                Salvar alterações
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
