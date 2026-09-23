import Image from "next/image";
import Badge from "@/components/ui/badge/badge.component";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table.component";
import {
  PROJECT_STATUS_MOCK,
  TEAM_PROJECTS_MOCK,
} from "@/mocks/team-projects.mock";

export default function BasicTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-b border-gray-100 dark:border-white/5">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Usuário
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Projeto
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Equipe
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Orçamento
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
            {TEAM_PROJECTS_MOCK.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="px-5 py-4 text-start sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full">
                      <Image
                        width={40}
                        height={40}
                        src={order.user.image}
                        alt={order.user.name}
                      />
                    </div>
                    <div>
                      <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {order.user.name}
                      </span>
                      <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
                        {order.user.role}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                  {order.projectName}
                </TableCell>
                <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                  <div className="flex -space-x-2">
                    {order.team.images.map((teamImage, index) => (
                      <div
                        key={index}
                        className="h-6 w-6 overflow-hidden rounded-full border-2 border-white dark:border-gray-900"
                      >
                        <Image
                          width={24}
                          height={24}
                          src={teamImage}
                          alt={`Membro da equipe ${index + 1}`}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                  <Badge
                    size="sm"
                    color={PROJECT_STATUS_MOCK[order.status].color}
                  >
                    {PROJECT_STATUS_MOCK[order.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                  {order.budget}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
