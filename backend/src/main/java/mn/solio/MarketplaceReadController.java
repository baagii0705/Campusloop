package mn.solio;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class MarketplaceReadController {
  private static final Set<String> PUBLIC_RESOURCES = Set.of("listings", "wanted_posts", "campus_posts", "seller_profiles");
  private static final Set<String> PRIVATE_RESOURCES = Set.of("chat_threads", "chat_messages", "solio_notifications", "listing_offers", "listing_reports");
  private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

  @Value("${solio.supabase.url:}") private String baseUrl;
  @Value("${solio.supabase.publishable-key:}") private String publishableKey;

  @GetMapping(value="/{resource}", produces=MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> list(@PathVariable String resource,
      @RequestParam(defaultValue="30") int limit,
      @RequestParam(defaultValue="0") int offset,
      @RequestHeader(value=HttpHeaders.AUTHORIZATION, required=false) String authorization) {
    if (!PUBLIC_RESOURCES.contains(resource) && !PRIVATE_RESOURCES.contains(resource))
      return error(HttpStatus.NOT_FOUND, "Unknown resource");
    if (PRIVATE_RESOURCES.contains(resource) && !validBearer(authorization))
      return error(HttpStatus.UNAUTHORIZED, "Sign in required");
    if (limit < 1 || limit > 50 || offset < 0 || offset > 100000)
      return error(HttpStatus.BAD_REQUEST, "Invalid pagination");
    if (baseUrl.isBlank() || publishableKey.isBlank())
      return error(HttpStatus.SERVICE_UNAVAILABLE, "Backend not configured");
    try {
      String query = "?select=*&limit=" + limit + "&offset=" + offset;
      URI uri = URI.create(baseUrl.replaceAll("/+$", "") + "/rest/v1/" + URLEncoder.encode(resource, StandardCharsets.UTF_8) + query);
      HttpRequest.Builder request = HttpRequest.newBuilder(uri)
        .timeout(Duration.ofSeconds(10))
        .header("apikey", publishableKey)
        .header("Accept", "application/json");
      if (validBearer(authorization)) request.header(HttpHeaders.AUTHORIZATION, authorization);
      HttpResponse<String> response = client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
      // Supabase RLS is the authorization boundary. Never use service-role keys here.
      if (response.statusCode() >= 500) return error(HttpStatus.BAD_GATEWAY, "Data source unavailable");
      return ResponseEntity.status(response.statusCode())
        .contentType(MediaType.APPLICATION_JSON).body(response.body());
    } catch (Exception e) {
      if (e instanceof InterruptedException) Thread.currentThread().interrupt();
      return error(HttpStatus.BAD_GATEWAY, "Data source unavailable");
    }
  }

  private boolean validBearer(String authorization) {
    return authorization != null && authorization.matches("Bearer [A-Za-z0-9_\\-\\.]+");
  }
  private ResponseEntity<String> error(HttpStatus status, String message) {
    return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON)
      .body("{\"error\":\"" + message + "\"}");
  }
}
