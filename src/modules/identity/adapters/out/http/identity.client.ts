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
    const timeoutMs = envs.identity?.timeoutMs ?? 4000;
    const config = this.resolveProviderConfig(params.documentType);
    const { url, method, body: requestBody } = this.resolveEndpoint(
      params.documentType,
      this.normalizeBaseUrl(config.baseUrl),
      params.documentNumber,
      config.provider,
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: requestBody,
        signal: controller.signal,
      });

      const responseBody = await this.safeJson<DecolectaResponse | any>(res);
      console.log("[identity] response", {
        status: res.status,
        ok: res.ok,
        documentType: params.documentType,
        documentNumber: params.documentNumber,
        body: responseBody,
        provider: config.provider,
      });

      if (!res.ok) {
        throw this.mapError(res.status);
      }

      if (!responseBody || typeof responseBody !== "object") {
        throw new HttpException(
          { type: "error", message: "Respuesta invalida del servicio externo" },
          HttpStatus.BAD_GATEWAY,
        );
      }

      if (params.documentType === SupplierDocType.DNI && config.provider === "decolecta") {
        return {
          documentType: params.documentType,
          documentNumber: params.documentNumber,
          data: {
            name: responseBody?.first_name ?? "",
            lastName: `${responseBody?.first_last_name ?? ""} ${responseBody?.second_last_name ?? ""}`.trim(),
          },
        };
      }

      if (params.documentType === SupplierDocType.RUC && config.provider === "diurvan") {
        return {
          documentType: params.documentType,
          documentNumber: params.documentNumber,
          data: {
            tradeName: responseBody?.message?.nombre_completo ?? "",
            address: `${responseBody?.message?.direccion ?? ""} (Ubigueo-${responseBody?.message?.ubigeo ?? ""})`.trim(),
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

  private resolveEndpoint(
    documentType: string,
    baseUrl: string,
    documentNumber: string,
    provider: "decolecta" | "diurvan",
  ) {
    if (documentType !== SupplierDocType.DNI && documentType !== SupplierDocType.RUC) {
      throw new HttpException("Tipo de documento no soportado", HttpStatus.BAD_REQUEST);
    }

    if (provider === "decolecta") {
      if (documentType !== SupplierDocType.DNI) {
        throw new HttpException("No se soporta este tipo de documento", HttpStatus.BAD_REQUEST);
      }
      const url = new URL("reniec/dni", baseUrl);
      url.searchParams.set("numero", documentNumber);
      return { url: url.toString(), method: "GET", body: undefined };
    }

    const url = new URL("dniruc", baseUrl);
    return {
      url: url.toString(),
      method: "POST",
      body: JSON.stringify({ documento: documentNumber }),
    };
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

  private resolveProviderConfig(documentType: string) {
    if (documentType === SupplierDocType.DNI) {
      const apiKey = process.env.IDENTITY_API_DECOLECTA_KEY;
      const baseUrl = process.env.IDENTITY_BASE_DECOLECTA_URL;
      if (!apiKey || !baseUrl) {
        throw new HttpException(
          { type: "error", message: "Configuracion Decolecta incompleta" },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      return { provider: "decolecta" as const, apiKey, baseUrl };
    }

    if (documentType === SupplierDocType.RUC) {
      const apiKey = process.env.IDENTITY_API_DIURVAN_KEY;
      const baseUrl = process.env.IDENTITY_BASE_DIURVAN_URL;
      if (!apiKey || !baseUrl) {
        throw new HttpException(
          { type: "error", message: "Configuracion Diurvan incompleta" },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      return { provider: "diurvan" as const, apiKey, baseUrl };
    }

    throw new HttpException("Tipo de documento no soportado", HttpStatus.BAD_REQUEST);
  }
}
