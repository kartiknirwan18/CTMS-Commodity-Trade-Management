package com.ctms.mapper;

import com.ctms.dto.ContractResponse;
import com.ctms.dto.UpcomingDeliveryResponse;
import com.ctms.entity.Contract;
import com.ctms.entity.Trade;
import com.ctms.util.Numbers;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Translates a contract entity into the API representations. */
public final class ContractMapper {

    private ContractMapper() {
    }

    public static ContractResponse toResponse(Contract contract) {
        Trade linkedTrade = contract.getLinkedTrade();
        return new ContractResponse(
                contract.getId(),
                contract.getContractReference(),
                contract.getBuyerName(),
                contract.getSellerName(),
                contract.getCommodity().getId(),
                contract.getCommodity().getName(),
                contract.getCommodity().getUnitOfMeasurement(),
                Numbers.toScale(contract.getContractQuantity()),
                Numbers.toScale(contract.getContractPrice()),
                Numbers.toScale(contract.getContractValue()),
                contract.getContractDate(),
                contract.getDeliveryDate(),
                contract.getDeliveryLocation(),
                contract.getStatus(),
                linkedTrade == null ? null : linkedTrade.getId(),
                linkedTrade == null ? null : linkedTrade.getTradeReference(),
                contract.getCreatedAt(),
                contract.getUpdatedAt()
        );
    }

    public static UpcomingDeliveryResponse toUpcomingResponse(Contract contract, LocalDate today) {
        return new UpcomingDeliveryResponse(
                contract.getId(),
                contract.getContractReference(),
                contract.getCommodity().getName(),
                contract.getCommodity().getUnitOfMeasurement(),
                Numbers.toScale(contract.getContractQuantity()),
                contract.getDeliveryDate(),
                ChronoUnit.DAYS.between(today, contract.getDeliveryDate()),
                contract.getDeliveryLocation(),
                contract.getBuyerName(),
                contract.getSellerName(),
                contract.getStatus()
        );
    }
}
