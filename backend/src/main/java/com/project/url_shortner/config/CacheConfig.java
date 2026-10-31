package com.project.url_shortner.config;

import java.time.Duration;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
@EnableCaching
public class CacheConfig {

	@Bean
	public CacheManager cacheManager() {
		CaffeineCacheManager cacheManager = new CaffeineCacheManager("shortUrls");
		cacheManager.setCaffeine(Caffeine.newBuilder()
				.maximumSize(10_000)
				.expireAfterAccess(Duration.ofMinutes(10)));
		return cacheManager;
	}
}
