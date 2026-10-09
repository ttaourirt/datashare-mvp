package com.datashare.file.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** US08 — remplace l'ensemble des tags d'un fichier (noms libres, créés si besoin). */
public record FileTagsRequest(@NotNull List<@NotBlank @Size(max = 30) String> tags) {}
