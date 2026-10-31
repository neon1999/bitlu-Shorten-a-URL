package com.project.url_shortner.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class OpenApiConfig {

	@Bean
	public OpenAPI urlShortenerOpenAPI() {
		return new OpenAPI()
				.info(new Info()
						.title("URL Shortener API")
						.description("API for creating and resolving shortened URLs")
						.version("v1"));
	}
}
