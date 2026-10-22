package com.ctms.mapper;

import com.ctms.dto.TradeResponse;
import com.ctms.entity.Contract;
import com.ctms.entity.Trade;
import com.ctms.util.Numbers;

/** Translates a trade entity into the API representation. */
public final class TradeMapper {

    private TradeMapper() {
    }

    public static TradeResponse toResponse(Trade trade) {
        Contract contract = trade.getContract();
        return new TradeResponse(
                trade.getId(),
                trade.getTradeReference(),
                trade.getCommodity().getId(),
                trade.getCommodity().getName(),
                trade.getCommodity().getUnitOfMeasurement(),
                trade.getTradeType(),
                Numbers.toScale(trade.getQuantity()),
                Numbers.toScale(trade.getPricePerUnit()),
                Numbers.toScale(trade.getTotalValue()),
                trade.getTradeDate(),
                trade.getCounterparty(),
                contract == null ? null : contract.getId(),
                contract == null ? null : contract.getContractReference(),
                trade.getStatus(),
                trade.getCreatedAt(),
                trade.getUpdatedAt()
        );
    }
}
