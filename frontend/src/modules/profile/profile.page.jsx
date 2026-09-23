import PageBreadcrumb from "@/components/common/page-breadcrumb.component";
import DangerZoneCard from "@/modules/profile/components/danger-zone-card.component";
import SecurityCard from "@/modules/profile/components/security-card.component";
import UserAddressCard from "@/modules/profile/components/user-address-card.component";
import UserMetaCard from "@/modules/profile/components/user-meta-card.component";

export default function ProfilePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Perfil" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 lg:mb-7 dark:text-white/90">
          Perfil
        </h3>
        <div className="space-y-6">
          <UserMetaCard />
          {/* Ocultos até o cadastro de usuário evoluir (endereço, segurança e sessões). */}
          <div className="hidden">
            <UserAddressCard />
            <SecurityCard />
            <DangerZoneCard />
          </div>
        </div>
      </div>
    </div>
  );
}
