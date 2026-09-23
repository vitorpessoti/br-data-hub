"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrDataModule = void 0;
const common_1 = require("@nestjs/common");
const db_module_1 = require("../../db/db.module");
const cep_module_1 = require("../cep/cep.module");
const cnpj_module_1 = require("../cnpj/cnpj.module");
const br_data_enrichment_processor_1 = require("./br-data-enrichment.processor");
const br_data_enrichment_worker_1 = require("./br-data-enrichment.worker");
const br_data_controller_1 = require("./br-data.controller");
const br_data_prisma_1 = require("./br-data.prisma");
const bullmq_br_data_enrichment_1 = require("./bullmq.br-data-enrichment");
let BrDataModule = class BrDataModule {
};
exports.BrDataModule = BrDataModule;
exports.BrDataModule = BrDataModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule, cep_module_1.CepModule, cnpj_module_1.CnpjModule],
        controllers: [br_data_controller_1.BrDataController],
        providers: [
            br_data_prisma_1.PrismaBrDataRepository,
            bullmq_br_data_enrichment_1.BullMqBrDataEnrichmentProvider,
            br_data_enrichment_processor_1.BrDataEnrichmentProcessor,
            br_data_enrichment_worker_1.BrDataEnrichmentWorker,
        ],
    })
], BrDataModule);
//# sourceMappingURL=br-data.module.js.map