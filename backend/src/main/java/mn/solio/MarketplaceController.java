package mn.solio;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MarketplaceController {
  private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
  @Value("${solio.supabase.url:}") private String supabaseUrl;
  @Value("${solio.supabase.publishable-key:}") private String publishableKey;

  @GetMapping("/health")
  public Map<String, String> health() { return Map.of("status", "ok", "service", "solio-api"); }

  @GetMapping(value="/listings", produces=MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> listings() {
    if (supabaseUrl.isBlank() || publishableKey.isBlank())
      return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("{\"error\":\"Supabase configuration missing\"}");
    try {
      URI endpoint = URI.create(supabaseUrl.replaceAll("/+$", "") + "/rest/v1/listings?select=*&limit=50");
      HttpRequest request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(10))
        .header("apikey", publishableKey).header("Accept", "application/json").GET().build();
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
      return ResponseEntity.status(response.statusCode()).contentType(MediaType.APPLICATION_JSON).body(response.body());
    } catch (Exception ex) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("{\"error\":\"Listings temporarily unavailable\"}");
    }
  }
}
