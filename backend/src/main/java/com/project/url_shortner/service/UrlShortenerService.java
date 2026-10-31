package com.project.url_shortner.service;

import java.util.UUID;

import javax.management.RuntimeErrorException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.Cacheable;

import com.project.url_shortner.Entities.url_mapping_table;
import com.project.url_shortner.criteria.UrlMappingCriteriaRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j 
public class UrlShortenerService {

	private final UrlMappingCriteriaRepository urlMappingRepository;

	public UrlShortenerService(UrlMappingCriteriaRepository urlMappingRepository) {
		this.urlMappingRepository = urlMappingRepository;
	}

	@Transactional
	public String create(String longUrl) {
		String shortCode = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
		if(checkIfShortCodeExist(shortCode)){

			log.info("Short code {} already exists, generating a new one.", shortCode);
			return create(longUrl);
		}
		log.info("Short code {} is unique, proceeding to save.", shortCode);
		urlMappingRepository.save(new url_mapping_table(null, shortCode, longUrl, null, null));
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
}
