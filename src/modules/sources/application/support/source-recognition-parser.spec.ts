import {
  matchSourceRecognitionCode,
  normalizeSourceRecognitionCode,
} from "./source-recognition-parser";

describe("source recognition parser", () => {
  const matchers = [
    { sourceId: "facebook", sourceName: "FACEBOOK", code: "FB" },
    { sourceId: "facebook", sourceName: "FACEBOOK", code: "FACEBOOK" },
    { sourceId: "facebook", sourceName: "FACEBOOK", code: "FACEBOOK ADS" },
    { sourceId: "whatsapp", sourceName: "WHATSAPP", code: "WHATSAPP" },
  ];

  it.each(["facebook ads Campaña julio", "FACEBOOK ADS CAMPAÑA JULIO", "FaCeBoOk AdS Campaña julio"])(
    "matches codes without considering letter case: %s",
    (note) => {
      expect(matchSourceRecognitionCode(note, matchers)).toEqual({
        sourceId: "facebook",
        sourceName: "FACEBOOK",
        code: "FACEBOOK ADS",
        advertisingCode: expect.stringMatching(/CAMPAÑA JULIO|Campaña julio/),
      });
    },
  );

  it("prefers the longest code and keeps the remaining original text", () => {
    expect(
      matchSourceRecognitionCode(
        "FACEBOOK ADS Nuevo 06.07.26 | Imagen 01 | C2",
        matchers,
      ),
    ).toEqual({
      sourceId: "facebook",
      sourceName: "FACEBOOK",
      code: "FACEBOOK ADS",
      advertisingCode: "Nuevo 06.07.26 | Imagen 01 | C2",
    });
  });

  it("does not match a code inside the note or as part of a larger token", () => {
    expect(matchSourceRecognitionCode("RECOMPRA FB JULIO", matchers)).toBeNull();
    expect(matchSourceRecognitionCode("FBX CAMPAÑA", matchers)).toBeNull();
  });

  it("returns no advertising code when the note only contains the alias", () => {
    expect(matchSourceRecognitionCode("whatsapp", matchers)?.advertisingCode).toBeNull();
  });

  it("normalizes accents, spacing and case for configured codes", () => {
    expect(normalizeSourceRecognitionCode("  Campaña   Perú ")).toBe("CAMPANA PERU");
  });
});
