import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { envs } from "src/infrastructure/config/envs";
import {
  DecolectaResponse,
  DniData,
  IdentityLookupResult,
  RucData,
} from "src/modules/identity/application/dtos/out";
import { IdentityLookupRepository } from "src/modules/identity/domain/ports/identity-lookup.repository";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

@Injectable()
export class DecolectaIdentityClient implements IdentityLookupRepository {
  async lookup(params: {
    documentType: string;
    documentNumber: string;
  }): Promise<IdentityLookupResult<DniData | RucData>> {
    const apiKey = envs.identity?.apiKey;
    const baseUrl = envs.identity?.baseUrl;
    const timeoutMs = envs.identity?.timeoutMs ?? 4000;

    if (!apiKey || !baseUrl) {
      throw new HttpException({ type: "error", message: "Configuracion Identity incompleta" }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    const { url } = this.resolveEndpoint(
      params.documentType,
      this.normalizeBaseUrl(baseUrl),
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ documento: params.documentNumber }),
        signal: controller.signal,
      });

      const body = await this.safeJson<DecolectaResponse>(res);

      if (!res.ok) {
        throw this.mapError(res.status);
      }

      if (!body || typeof body !== "object") {
        throw new HttpException(
          { type: "error", message: "Respuesta invalida del servicio externo" },
          HttpStatus.BAD_GATEWAY,
        );
      }

      if (params.documentType === SupplierDocType.DNI) {
        return {
          documentType: params.documentType,
          documentNumber: params.documentNumber,
          data: {
            name: body?.message?.nombres ?? "",
            lastName: `${body?.message?.apellido_paterno ?? ""} ${body?.message?.apellido_materno ?? ""}`.trim(),
          },
        };
      }

      if (params.documentType === SupplierDocType.RUC) {
        return {
          documentType: params.documentType,
          documentNumber: params.documentNumber,
          data: {
            tradeName: body?.message?.nombre_completo ?? "",
            address: `${body?.message?.direccion ?? ""} (Ubigueo-${body?.message?.ubigeo ?? ""})`.trim(),
          },
        };
      }

      throw new HttpException(
        { type: "error", message: "Tipo de documento no soportado" },
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if ((error as any)?.name === "AbortError") {
        throw new HttpException(
          { type: "error", message: "Tiempo de espera agotado" },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      throw new HttpException(
        { type: "error", message: "Error al consultar servicio externo" },
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveEndpoint(documentType: string, baseUrl: string) {
    if (documentType !== SupplierDocType.DNI && documentType !== SupplierDocType.RUC) {
      throw new HttpException("Tipo de documento no soportado", HttpStatus.BAD_REQUEST);
    }

    const path = "dniruc";
    const url = new URL(path, baseUrl);
    return { url: url.toString() };
  }

  private async safeJson<T>(res: Response): Promise<T | null> {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  private mapError(status: number) {
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
    if (trimmed.endsWith("/")) return trimmed;
    return `${trimmed}/`;
  }
}
