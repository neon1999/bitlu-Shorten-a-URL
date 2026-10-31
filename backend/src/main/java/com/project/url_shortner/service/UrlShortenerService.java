package com.project.url_shortner.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.Cache;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.project.url_shortner.Entities.url_mapping_table;
import com.project.url_shortner.criteria.UrlMappingCriteriaRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j 
public class UrlShortenerService {

	private final UrlMappingCriteriaRepository urlMappingRepository;
	
	@Autowired 
	private CacheManager cacheManager;

	public UrlShortenerService(UrlMappingCriteriaRepository urlMappingRepository) {
		this.urlMappingRepository = urlMappingRepository;
	}

	@Transactional
	public String create(String longUrl) {
		return create(longUrl, null);
	}

	@Transactional
	public String create(String longUrl, String customUrl) {
		String shortCode;
		if (customUrl == null) {
			shortCode = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
			while (checkIfShortCodeExist(shortCode)) {
				log.info("Short code {} already exists, generating a new one.", shortCode);
				shortCode = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
			}
		} else {
			if (customUrl.length() < 3 || customUrl.length() > 32 || !customUrl.matches("[A-Za-z0-9._~-]+")) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid custom shortcode");
			}
			if (!checkIfCustomUrlExist(customUrl)) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Custom shortcode is already taken");
			}
			shortCode = customUrl;
		}
		log.info("Short code {} is unique, proceeding to save.", shortCode);
		urlMappingRepository.save(new url_mapping_table(null, shortCode, longUrl, null, null));
		Cache shortUrlsCache = cacheManager.getCache("shortUrls");
		if (shortUrlsCache != null) {
			shortUrlsCache.put(shortCode, longUrl);
			log.info("Current shortUrls cache: {}",
					((com.github.benmanes.caffeine.cache.Cache<?, ?>) shortUrlsCache.getNativeCache()).asMap());
		}
		return shortCode;
	}

	private boolean checkIfShortCodeExist(String shortCode) {
		// TODO Auto-generated method stub
		return urlMappingRepository.findByShortCode(shortCode).isPresent();
	}

	@Transactional(readOnly = true)
	@Cacheable(cacheNames = "shortUrls", key = "#shortCode", unless = "#result == null")
	public String findLongUrl(String shortCode) {
		return urlMappingRepository.findByShortCode(shortCode)
				.map(url_mapping_table::getLongUrl)
				.orElse(null);
	}


	public boolean checkIfCustomUrlExist(String shortCode) {
		Cache shortUrlsCache = cacheManager.getCache("shortUrls");
		if (shortUrlsCache != null && shortUrlsCache.get(shortCode) != null) {
			return false;
		}
		return urlMappingRepository.findByShortCode(shortCode).isEmpty();
	}
}
