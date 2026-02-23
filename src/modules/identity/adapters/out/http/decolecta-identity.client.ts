import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { envs } from "src/infrastructure/config/envs";
import {
  IdentityLookupRepository,
  IdentityLookupResult,
} from "src/modules/identity/application/ports/identity-lookup.repository";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

@Injectable()
export class DecolectaIdentityClient implements IdentityLookupRepository {
  async lookup(params: {
    documentType: string;
    documentNumber: string;
  }): Promise<IdentityLookupResult> {
    const apiKey = envs.identity?.apiKey;
    const baseUrl = envs.identity?.baseUrl;
    const timeoutMs = envs.identity?.timeoutMs ?? 4000;

    if (!apiKey || !baseUrl) {
      throw new HttpException({ type: "error", message: "Configuracion Identity incompleta" }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    const { url } = this.resolveEndpoint(
      params.documentType,
      params.documentNumber,
      this.normalizeBaseUrl(baseUrl),
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });

      const body = await this.safeJson(res);

      if (!res.ok) {
        throw this.mapError(res.status, body);
      }

      return {
        documentType: params.documentType,
        documentNumber: params.documentNumber,
        data: body,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if ((error as any)?.name === "AbortError") {
        throw new HttpException({ type: "error", message: "Tiempo de espera agotado" }, HttpStatus.GATEWAY_TIMEOUT);
      }
      throw new HttpException(
        { type: "error", message: "Error al consultar servicio externo" },
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveEndpoint(documentType: string, documentNumber: string, baseUrl: string) {
    if (documentType === SupplierDocType.DNI) {
      const path = "reniec/dni";
      const url = new URL(path, baseUrl);
      url.searchParams.set("numero", documentNumber);
      return { url: url.toString() };
    }

    if (documentType === SupplierDocType.RUC) {
      const path = "sunat/ruc";
      const url = new URL(path, baseUrl);
      url.searchParams.set("numero", documentNumber);
      return { url: url.toString() };
    }

    throw new HttpException("Tipo de documento no soportado", HttpStatus.BAD_REQUEST);
  }

  private async safeJson(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private mapError(status: number, body: unknown) {
    if (status >= 500) {
      return new HttpException(
        { type: "error", message: "Servicio externo no disponible" },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (status === 404) {
      return new HttpException({ type: "error", message: "No encontrado" }, HttpStatus.NOT_FOUND);
    }
    if (status === 401 || status === 403) {
      return new HttpException({ type: "error", message: "No autorizado" }, HttpStatus.UNAUTHORIZED);
    }
    if (status === 400) {
      return new HttpException(
        {
          type: "error",
          message: "Solicitud invalida",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return new HttpException(
      {
        type: "error",
        message: "Error inesperado",
      },
      HttpStatus.BAD_GATEWAY,
    );
  }

  private normalizeBaseUrl(baseUrl: string) {
    const trimmed = baseUrl.trim();
    if (trimmed.endsWith("/v1/")) return trimmed;
    if (trimmed.endsWith("/v1")) return `${trimmed}/`;
    if (trimmed.endsWith("/")) return `${trimmed}v1/`;
    return `${trimmed}/v1/`;
  }
}
