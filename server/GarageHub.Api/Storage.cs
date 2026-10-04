using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace GarageHub.Api;

public interface IFileStorage
{
    Task<string> UploadAsync(Stream content, string objectName, string contentType, CancellationToken cancellationToken);
    Task<string> GetDownloadUrlAsync(string storageKey, CancellationToken cancellationToken);
    Task DeleteAsync(string storageKey, CancellationToken cancellationToken);
}

public sealed class LocalFileStorage(IWebHostEnvironment environment) : IFileStorage
{
    public async Task<string> UploadAsync(Stream content, string objectName, string contentType, CancellationToken cancellationToken)
    {
        var uploadRoot = Path.Combine(environment.ContentRootPath, "wwwroot", "uploads");
        var destination = Path.Combine(uploadRoot, objectName);
        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
        await using var output = File.Create(destination);
        await content.CopyToAsync(output, cancellationToken);
        return $"uploads/{objectName}";
    }

    public Task<string> GetDownloadUrlAsync(string storageKey, CancellationToken cancellationToken) =>
        Task.FromResult($"/{storageKey.TrimStart('/')}");

    public Task DeleteAsync(string storageKey, CancellationToken cancellationToken)
    {
        var path = Path.Combine(environment.ContentRootPath, "wwwroot", storageKey.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }
}

public sealed class SupabaseFileStorage(HttpClient httpClient, IConfiguration configuration) : IFileStorage
{
    private readonly string _url = Required(configuration, "Supabase:Url").TrimEnd('/');
    private readonly string _serviceRoleKey = Required(configuration, "Supabase:ServiceRoleKey");
    private readonly string _bucket = configuration["Supabase:StorageBucket"] ?? "garage-documents";

    public async Task<string> UploadAsync(Stream content, string objectName, string contentType, CancellationToken cancellationToken)
    {
        var storageKey = $"{objectName[..2]}/{objectName}";
        using var request = CreateRequest(HttpMethod.Post, $"/storage/v1/object/{Escape(_bucket)}/{EscapePath(storageKey)}");
        request.Headers.Add("x-upsert", "false");
        request.Content = new StreamContent(content);
        request.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        return storageKey;
    }

    public async Task<string> GetDownloadUrlAsync(string storageKey, CancellationToken cancellationToken)
    {
        using var request = CreateRequest(HttpMethod.Post, $"/storage/v1/object/sign/{Escape(_bucket)}/{EscapePath(storageKey)}");
        request.Content = JsonContent.Create(new { expiresIn = 3600 });
        using var response = await httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var signedUrl = document.RootElement.GetProperty("signedURL").GetString()
            ?? throw new InvalidOperationException("Supabase Storage did not return a signed URL.");
        return $"{_url}/storage/v1{signedUrl}";
    }

    public async Task DeleteAsync(string storageKey, CancellationToken cancellationToken)
    {
        using var request = CreateRequest(HttpMethod.Delete, $"/storage/v1/object/{Escape(_bucket)}");
        request.Content = JsonContent.Create(new { prefixes = new[] { storageKey } });
        using var response = await httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path)
    {
        var request = new HttpRequestMessage(method, $"{_url}{path}");
        request.Headers.Add("apikey", _serviceRoleKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _serviceRoleKey);
        return request;
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode) return;
        var detail = await response.Content.ReadAsStringAsync(cancellationToken);
        throw new InvalidOperationException($"Supabase Storage request failed ({(int)response.StatusCode}): {detail}");
    }

    private static string Required(IConfiguration configuration, string key) =>
        configuration[key] ?? throw new InvalidOperationException($"{key.Replace(':', '_')} is required when Supabase storage is enabled.");

    private static string Escape(string value) => Uri.EscapeDataString(value);
    private static string EscapePath(string value) => string.Join('/', value.Split('/').Select(Escape));
}
