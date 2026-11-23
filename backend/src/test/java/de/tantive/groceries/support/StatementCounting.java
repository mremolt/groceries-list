package de.tantive.groceries.support;

import javax.sql.DataSource;
import net.ttddyy.dsproxy.QueryCountHolder;
import net.ttddyy.dsproxy.support.ProxyDataSourceBuilder;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/** Counts JDBC statements through a proxy around the data source, independent of Hibernate (SPRING-TEST-06, API-N1-06). */
@TestConfiguration(proxyBeanMethods = false)
public class StatementCounting {

    @Bean
    static BeanPostProcessor countingDataSource() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof DataSource dataSource && "dataSource".equals(beanName)) {
                    return ProxyDataSourceBuilder.create(dataSource)
                            .countQuery()
                            .build();
                }
                return bean;
            }
        };
    }

    public static void reset() {
        QueryCountHolder.clear();
    }

    public static long statements() {
        return QueryCountHolder.getGrandTotal().getTotal();
    }
}
