package com.ctms.repository;

import com.ctms.entity.Contract;
import com.ctms.entity.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * Data access for delivery contracts.
 */
public interface ContractRepository extends JpaRepository<Contract, Long>, JpaSpecificationExecutor<Contract> {

    boolean existsByCommodityId(Long commodityId);

    boolean existsByContractReferenceIgnoreCase(String contractReference);

    long countByContractReferenceStartingWith(String prefix);

    long countByStatus(ContractStatus status);

    /**
     * Contracts whose delivery falls inside the given window, joined with their
     * commodity so the mapper can render the response without extra queries.
     */
    @Query("""
            SELECT c FROM Contract c
            JOIN FETCH c.commodity
            WHERE c.status IN :statuses
              AND c.deliveryDate BETWEEN :from AND :to
            ORDER BY c.deliveryDate ASC, c.id ASC
            """)
    List<Contract> findUpcomingDeliveries(@Param("statuses") Collection<ContractStatus> statuses,
                                          @Param("from") LocalDate from,
                                          @Param("to") LocalDate to);
}
