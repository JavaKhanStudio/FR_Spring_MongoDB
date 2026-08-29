package fr.formation.amiraute.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

/**
 * @EnableMongoAuditing active @CreatedDate et @LastModifiedDate sur Navire.
 * Sans cette annotation, les deux champs restent obstinement nuls - et c'est
 * l'oubli le plus frequent avec l'audit Spring Data.
 */
@Configuration
@EnableMongoAuditing
public class MongoConfig {
}
