import { describe, it, expect, vi } from "vitest";
import {
  buildResultFileUrls,
  createPhantomBusterClient,
  PHANTOMBUSTER_API_BASE,
  PhantomBusterApiError,
} from "../phantombuster-client";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("buildResultFileUrls", () => {
  it("builds csv/json URLs when org and folder are present", () => {
    const urls = buildResultFileUrls({
      orgS3Folder: "/org-folder/",
      s3Folder: "run-folder/",
    });

    expect(urls).toEqual({
      json: "https://phantombuster.s3.amazonaws.com/org-folder/run-folder/result.json",
      csv: "https://phantombuster.s3.amazonaws.com/org-folder/run-folder/result.csv",
    });
  });

  it("returns null if pointers are missing", () => {
    expect(buildResultFileUrls({ orgS3Folder: "org" })).toBeNull();
    expect(buildResultFileUrls({ s3Folder: "run" })).toBeNull();
    expect(buildResultFileUrls({})).toBeNull();
  });
});

describe("createPhantomBusterClient", () => {
  it("launches an agent with POST body and auth header", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true })) as unknown as typeof fetch;
    const client = createPhantomBusterClient({
      apiKey: "pb_test_key",
      fetchImpl: fetchMock,
    });

    await client.launchAgent({ id: 123, argument: { foo: "bar" }, saveArgument: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${PHANTOMBUSTER_API_BASE}/api/v2/agents/launch`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "X-Phantombuster-Key": "pb_test_key",
      "Content-Type": "application/json",
    });
    expect(init.body).toBe(
      JSON.stringify({ id: 123, argument: { foo: "bar" }, saveArgument: true })
    );
  });

  it("fetches an agent by id with query params", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: 777 })) as unknown as typeof fetch;
    const client = createPhantomBusterClient({
      apiKey: "pb_test_key",
      fetchImpl: fetchMock,
    });

    const data = await client.fetchAgent(777);
    expect(data).toEqual({ id: 777 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${PHANTOMBUSTER_API_BASE}/api/v2/agents/fetch?id=777`);
    expect(init.method).toBe("GET");
  });

  it("throws typed error on non-2xx responses", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: "bad_request" }, 400)
    ) as unknown as typeof fetch;
    const client = createPhantomBusterClient({
      apiKey: "pb_test_key",
      fetchImpl: fetchMock,
    });

    await expect(client.fetchAllAgents()).rejects.toBeInstanceOf(PhantomBusterApiError);
    await expect(client.fetchAllAgents()).rejects.toMatchObject({
      status: 400,
      payload: { error: "bad_request" },
    });
  });

  it("throws config error when API key is missing", async () => {
    const fetchMock = vi.fn() as unknown as typeof fetch;
    const client = createPhantomBusterClient({
      apiKey: "",
      fetchImpl: fetchMock,
    });

    await expect(client.fetchAllAgents()).rejects.toThrow("PHANTOMBUSTER_API_KEY not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
