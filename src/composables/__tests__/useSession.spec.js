import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useSession } from "../useSession";
import { useTranslation } from "../useTranslation";

describe("useSession (#51)", () => {
  const original = window.frappe;
  const boot = (user, user_fullname) => (window.frappe = { ...original, user, user_fullname });

  beforeEach(() => useTranslation().setLanguage("en"));
  afterEach(() => {
    window.frappe = original;
  });

  it("greets by the full name the page boots, and keeps the email apart", () => {
    boot("oq.surveyor.test@example.com", "OQ Test Surveyor");
    const { displayName, email, userInitial } = useSession();
    expect(displayName.value).toBe("OQ Test Surveyor");
    expect(email.value).toBe("oq.surveyor.test@example.com");
    expect(userInitial.value).toBe("O");
  });

  it("falls back to the email, never to a part of it, when there is no full name", () => {
    boot("archana@example.com", "  ");
    expect(useSession().displayName.value).toBe("archana@example.com");
  });

  it("calls a guest a guest, in the chosen language, with no email", () => {
    boot("Guest", "");
    const { displayName, email } = useSession();
    expect(email.value).toBe("");
    expect(displayName.value).toBe("Guest Surveyor");
    useTranslation().setLanguage("hi");
    expect(displayName.value).toBe("अतिथि सर्वेक्षक");
  });

  it("invents no identity when the page boots no user", () => {
    window.frappe = undefined;
    const { displayName, email } = useSession();
    expect(email.value).toBe("");
    expect(displayName.value).toBe("Guest Surveyor");
  });
});
