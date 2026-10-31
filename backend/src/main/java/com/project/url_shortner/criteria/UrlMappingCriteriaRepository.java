package com.project.url_shortner.criteria;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.project.url_shortner.Entities.url_mapping_table;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;

@Repository
public class UrlMappingCriteriaRepository {

	@PersistenceContext
	private EntityManager entityManager;

	public url_mapping_table save(url_mapping_table mapping) {
		entityManager.persist(mapping);
		return mapping;
	}

	public Optional<url_mapping_table> findByShortCode(String shortCode) {
		CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
		CriteriaQuery<url_mapping_table> query = criteriaBuilder.createQuery(url_mapping_table.class);
		Root<url_mapping_table> mapping = query.from(url_mapping_table.class);

		query.select(mapping)
				.where(criteriaBuilder.equal(mapping.get("shortCode"), shortCode));

		return entityManager.createQuery(query).getResultStream().findFirst();
	}
}
