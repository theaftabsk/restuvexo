"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
function getResolvedDatabaseUrl() {
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl)
        return dbUrl;
    let resolvedUrl = dbUrl;
    try {
        const match = dbUrl.match(/^(postgres(?:ql)?):\/\/([^:]+):([^@]+)@([^/]+)\/([^?#]+)(.*)$/);
        if (match) {
            const [_, protocol, user, password, hostPort, database, params] = match;
            const [host, port] = hostPort.split(':');
            if (!/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(host)) {
                if (host.includes('neon.tech') || host.includes('supabase.co')) {
                    const output = (0, child_process_1.execSync)(`nslookup ${host} 8.8.8.8`, { encoding: 'utf8', timeout: 4000 });
                    const ipv4Regex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
                    const matches = output.match(ipv4Regex) || [];
                    const ips = matches.filter(ip => ip !== '8.8.8.8');
                    if (ips.length > 0) {
                        const resolvedIp = ips[0];
                        const targetPort = port ? `:${port}` : '';
                        let newParams = params || '';
                        if (!newParams.includes('sslaccept=')) {
                            newParams += (newParams ? '&' : '?') + 'sslaccept=accept_invalid_certs';
                        }
                        const project = host.split('.')[0];
                        if (!newParams.includes('options=')) {
                            newParams += `&options=project%3D${project}`;
                        }
                        resolvedUrl = `${protocol}://${user}:${password}@${resolvedIp}${targetPort}/${database}${newParams}`;
                        console.log(`🚀 [DNS Resolver] Successfully resolved database host ${host} to IP ${resolvedIp}`);
                    }
                }
            }
        }
    }
    catch (err) {
        console.warn(`⚠️ [DNS Resolver Warning] Fallback resolution failed: ${err.message}. Using default DATABASE_URL.`);
    }
    if (dbUrl.includes('-pooler') && !resolvedUrl.includes('pgbouncer=')) {
        const separator = resolvedUrl.includes('?') ? '&' : '?';
        resolvedUrl += `${separator}pgbouncer=true`;
        console.log(`🔌 [Database URL Helper] Automatically appended pgbouncer=true for pooled endpoint connection.`);
    }
    return resolvedUrl;
}
let PrismaService = class PrismaService extends client_1.PrismaClient {
    constructor() {
        const activeDbUrl = getResolvedDatabaseUrl();
        super({
            datasources: {
                db: {
                    url: activeDbUrl,
                },
            },
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });
    }
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map