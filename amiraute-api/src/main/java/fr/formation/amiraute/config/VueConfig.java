package fr.formation.amiraute.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Branche le compteur de requetes MongoDB sur le pilote, et le pose dans le
 * modele de chaque page.
 */
@Configuration
public class VueConfig implements WebMvcConfigurer {

    /** Enregistre l'ecouteur aupres du pilote MongoDB. */
    @Bean
    public MongoClientSettingsBuilderCustomizer ecouteurDeCommandes() {
        return reglages -> reglages.addCommandListener(new CompteurRequetesMongo());
    }

    /**
     * Un INTERCEPTEUR, et non un filtre.
     *
     * Le releve doit etre pose dans le MODELE, pas dans la requete : depuis
     * Thymeleaf 3.1, l'objet #request n'est plus accessible depuis un
     * gabarit ("no longer available by default for template expressions").
     *
     * postHandle s'execute apres le controleur et AVANT le rendu : le compte
     * y est donc complet, et le gabarit lit ${compteurMongo}.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registre) {
        registre.addInterceptor(new HandlerInterceptor() {

            @Override
            public boolean preHandle(HttpServletRequest requete, HttpServletResponse reponse,
                                     Object gestionnaire) {
                CompteurRequetesMongo.demarrer();
                return true;
            }

            @Override
            public void postHandle(HttpServletRequest requete, HttpServletResponse reponse,
                                   Object gestionnaire, ModelAndView modele) {
                if (modele != null) {
                    modele.addObject("compteurMongo", CompteurRequetesMongo.lire());
                }
            }

            @Override
            public void afterCompletion(HttpServletRequest requete, HttpServletResponse reponse,
                                        Object gestionnaire, Exception exception) {
                // Toujours liberer le ThreadLocal, meme si le controleur a leve.
                CompteurRequetesMongo.arreter();
            }
        }).addPathPatterns("/vue/**");
    }
}
