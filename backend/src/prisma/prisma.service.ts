import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

function getResolvedDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) return dbUrl;

  let resolvedUrl = dbUrl;

  try {
    const match = dbUrl.match(/^(postgres(?:ql)?):\/\/([^:]+):([^@]+)@([^/]+)\/([^?#]+)(.*)$/);
    if (match) {
      const [_, protocol, user, password, hostPort, database, params] = match;
      const [host, port] = hostPort.split(':');
      
      // If the host is already an IP address, do not resolve
      if (!/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(host)) {
        // Intercept and resolve domains likely to experience blocks
        if (host.includes('neon.tech') || host.includes('supabase.co')) {
          const output = execSync(`nslookup ${host} 8.8.8.8`, { encoding: 'utf8', timeout: 4000 });
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
  } catch (err) {
    console.warn(`⚠️ [DNS Resolver Warning] Fallback resolution failed: ${err.message}. Using default DATABASE_URL.`);
  }

  // Ensure pgbouncer=true is appended if host has '-pooler' and it's not present in resolvedUrl
  if (dbUrl.includes('-pooler') && !resolvedUrl.includes('pgbouncer=')) {
    const separator = resolvedUrl.includes('?') ? '&' : '?';
    resolvedUrl += `${separator}pgbouncer=true`;
    console.log(`🔌 [Database URL Helper] Automatically appended pgbouncer=true for pooled endpoint connection.`);
  }

  return resolvedUrl;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
}
