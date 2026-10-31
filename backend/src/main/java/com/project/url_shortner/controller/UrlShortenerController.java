package com.project.url_shortner.controller;

import java.net.URI;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.project.url_shortner.DTOs.UrlRequestDTO;
import com.project.url_shortner.DTOs.UrlResponseDTO;
import com.project.url_shortner.service.UrlShortenerService;

@RestController
@RequestMapping("/")
@Tag(name = "URL shortener", description = "Create and resolve shortened URLs")
public class UrlShortenerController {

	private final UrlShortenerService urlShortenerService;

	public UrlShortenerController(UrlShortenerService urlShortenerService) {
		this.urlShortenerService = urlShortenerService;
	}

	@PostMapping("url")
	@Operation(summary = "Create a short URL")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "Short URL created"),
			@ApiResponse(responseCode = "400", description = "The long URL is missing or blank")
	})
	public ResponseEntity<UrlResponseDTO> createShortUrl(@RequestBody UrlRequestDTO request) {
		if (request == null || request.getLongUrl() == null || request.getLongUrl().isBlank()) {
			return ResponseEntity.badRequest().build();
		}

		String shortCode = urlShortenerService.create(request.getLongUrl());
		URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
				.path("/{shortCode}")
				.buildAndExpand(shortCode)
				.toUri();
		return ResponseEntity.created(location)
				.body(new UrlResponseDTO(location.toString()));
	}

	@GetMapping("{shortCode}")
	@Operation(summary = "Resolve a short URL")
	@ApiResponses({
			@ApiResponse(responseCode = "302", description = "Redirects to the original long URL"),
			@ApiResponse(responseCode = "404", description = "Short code not found")
	})
	public ResponseEntity<Void> getLongUrl(@PathVariable String shortCode) {
		String longUrl = urlShortenerService.findLongUrl(shortCode);
		if (longUrl == null) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.status(HttpStatus.FOUND)
				.location(URI.create(longUrl))
				.build();
	}
}
