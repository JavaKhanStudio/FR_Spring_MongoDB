package fr.formation.amiraute.web;

import fr.formation.amiraute.domain.Mission;
import fr.formation.amiraute.domain.enumeration.StatutMission;
import fr.formation.amiraute.service.MissionService;
import fr.formation.amiraute.web.dto.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/missions")
public class MissionController {

    private final MissionService service;

    public MissionController(MissionService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<Mission> list(
            @RequestParam(defaultValue = "EN_COURS") StatutMission statut,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int taille) {
        return PageResponse.de(service.listByStatut(statut,
                PageRequest.of(page, taille, Sort.by(Sort.Direction.DESC, "dateDebut"))));
    }

    @GetMapping("/{id}")
    public Mission byId(@PathVariable String id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mission create(@Valid @RequestBody Mission mission) {
        return service.create(mission);
    }

    /** $push cote serveur, apres verification applicative de la reference. */
    @PutMapping("/{id}/participants/{navireId}")
    public Mission addParticipant(@PathVariable String id, @PathVariable String navireId) {
        return service.addParticipant(id, navireId);
    }

    @DeleteMapping("/{id}/participants/{navireId}")
    public Mission removeParticipant(@PathVariable String id, @PathVariable String navireId) {
        return service.removeParticipant(id, navireId);
    }

    @PutMapping("/{id}/cloture")
    public Mission close(@PathVariable String id,
                            @RequestParam(required = false)
                            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFin) {
        return service.close(id, dateFin);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
